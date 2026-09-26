import { Box, Container, Flex, Link } from '@chakra-ui/react'
import { LuBike } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'
import { paths } from '../navigation/paths'
import { MobileNav } from './MobileNav'
import { PrimaryNav } from './PrimaryNav'
import { UserMenu } from './UserMenu'

export function AppHeader() {
  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="sticky"
      borderBottomWidth="1px"
      bg="bg/80"
      backdropFilter="blur(8px)"
    >
      <Container maxW="7xl">
        <Flex h="16" align="center" gap={{ base: '2', md: '8' }}>
          <MobileNav />
          <Link
            asChild
            display="flex"
            alignItems="center"
            gap="2"
            fontWeight="bold"
            fontSize="lg"
            letterSpacing="tight"
            color="fg"
            textDecoration="none"
            focusRing="outside"
            _hover={{ textDecoration: 'none' }}
          >
            <RouterLink to={paths.dashboard}>
              <Flex
                as="span"
                align="center"
                justify="center"
                boxSize="8"
                borderRadius="l2"
                bg="colorPalette.solid"
                color="colorPalette.contrast"
              >
                <LuBike aria-hidden />
              </Flex>
              Athlify
            </RouterLink>
          </Link>
          <PrimaryNav />
          <Box ms="auto">
            <UserMenu />
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}
